import React, { useState, useEffect } from 'react';
import {
  Table,
  Divider,
  Tag,
  Icon,
  Form,
  Row,
  Col,
  Select,
  Dropdown,
  Menu,
  Input
} from 'antd';
import { zhlist, enlist, tagsOf } from '../data/wordlist';
import WordInfo from '../view/WordInfo';
import Fetch from '../fetch';
const { Option } = Select;
export default function Hist({
  history,
  match: {
    params: { page }
  }
}) {
  const {
    setFormState,
    operator,
    orders,
    value,
    list,
    flag,
    lang
  } = useFormState();
  const [loading, pagination, data, onAction] = useTableState({
    page,
    flag: (flag | 1) - 1 + lang,
    other: flag & 1,
    order: orders.map(({ value }) => value).join('-'),
    word: value.trim(),
    operator
  });
  function onTableChange({ current }) {
    history.replace(`/history/${current}`);
  }
  function onLangChange(value) {
    setFormState('lang', value);
  }
  function onValueChange({ target: { value } }) {
    if (!value.startsWith("'")) {
      setFormState('value', value);
    }
  }
  function onSelectFlag(val) {
    if (operator === 'and') {
      if (val === 1) {
        return setFormState('flag', val + (flag & 6));
      } else if (val & 6) {
        return setFormState('flag', (flag | 6) - 6 + val);
      } else if (flag & 1) {
        return setFormState('flag', (flag | 1) - 1 + val);
      }
    }
    return setFormState('flag', flag + val);
  }
  function onDeselectFlag(val) {
    setFormState('flag', flag - val);
  }
  function onOperatorChange(val) {
    setFormState('operator', val);
  }
  function onOrdersChange(val) {
    setFormState('orders', val);
  }
  function maxTag(vals) {
    if (!vals.length) return '（空）';
    return `(${vals.length}) ${vals
      .map(val => {
        switch (val) {
          case 1:
            return '其他';
          case 2:
            return '收藏';
          case 4:
            return '删除';
          default:
            let index = 4;
            while (val >> index) index++;
            return list[index - 4].short;
        }
      })
      .reduce(
        (a, b) => `${a}${a.slice(-1).charCodeAt(0) < 256 ? ', ' : '，'}${b}`
      )}`;
  }
  return (
    <div className="page-content">
      <Form style={{ marginBottom: '8px' }}>
        <Row gutter={12}>
          <Col span={2}>
            <Select value={lang} onChange={onLangChange}>
              <Option value={0}>英文</Option>
              <Option value={1}>中文</Option>
            </Select>
          </Col>
          <Col span={3}>
            <Input
              value={value}
              placeholder="搜索_%"
              onChange={onValueChange}
            />
          </Col>
          <Col span={11}>
            <Select
              mode="multiple"
              maxTagCount={0}
              value={binArrayOf(flag)}
              onSelect={onSelectFlag}
              maxTagPlaceholder={maxTag}
              onDeselect={onDeselectFlag}
            >
              <Option value={2} key={1} title="我的收藏">
                <Icon type="star" theme="filled" />
                {' 收藏'}
              </Option>
              {list.map(({ short, long }, index) => (
                <Option value={1 << (index + 3)} key={index + 3} title={long}>
                  {short}
                </Option>
              ))}
              <Option value={1} key={0} title="不属任何词表">
                <Icon type="pie-chart" theme="filled" />
                {' 其他'}
              </Option>
              <Option value={4} key={2} title="删除">
                <Icon type="delete" theme="filled" />
                {' 删除'}
              </Option>
            </Select>
          </Col>
          <Col span={3}>
            <Select value={operator} onChange={onOperatorChange}>
              <Option value="or">或运算</Option>
              <Option value="and">和运算</Option>
            </Select>
          </Col>
          <Col span={5}>
            <Select
              value={undefined}
              onChange={onOrdersChange}
              placeholder={`排序：${orders
                .map(({ title }) => title)
                .join(' > ')}`}
            >
              {orders.map(({ value, title }) => (
                <Option value={value} key={value}>
                  {title}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Form>
      <Table
        rowKey="rowid"
        loading={loading}
        dataSource={data}
        onChange={onTableChange}
        pagination={pagination}
        columns={columns(onAction, list)}
      />
    </div>
  );
}

function binArrayOf(integer) {
  const result = [];
  while (integer > 0) {
    result.push((integer & 1) << result.length);
    integer >>= 1;
  }
  result.push(result.splice(result.indexOf(1), 1)[0]);
  result.push(result.splice(result.indexOf(4), 1)[0]);
  return result.filter(Boolean);
}

function listOf(lang) {
  switch (lang) {
    case 0:
      return enlist;
    case 1:
      return zhlist;
    default:
      throw `Unknown lang: ${lang}`;
  }
}

function flagOf(lang, operator) {
  switch (operator) {
    case 'and':
      return 2;
    case 'or':
      return (1 << (listOf(lang).length + 3)) - 5;
    default:
      throw `Unknown operator: ${operator}`;
  }
}

function useFormState() {
  const [lang, setLang] = useState(0);
  const [operator, setOperator] = useState('or');
  const [value, setValue] = useState('');
  const [flag, setFlag] = useState(flagOf(lang, operator));
  const [_orders, setOrders] = useState(['word', 'time_DESC', 'freq_DESC']);
  function setFormState(key, val) {
    switch (key) {
      case 'lang':
        setFlag(flagOf(val, operator));
        return setLang(val);
      case 'operator':
        if (val === 'and') {
          setFlag(2);
        }
        return setOperator(val);
      case 'flag':
        return setFlag(val);
      case 'orders':
        return setOrders([val].concat(_orders.filter(v => v !== val)));
      case 'value':
        return setValue(val);
      default:
        throw `Unknown key: ${key}`;
    }
  }

  const list = listOf(lang);
  const orders = _orders.map(value => {
    switch (value) {
      case 'word':
        return { value, title: '词条' };
      case 'time_DESC':
        return { value, title: '最近' };
      case 'freq_DESC':
        return { value, title: '次数' };
      default:
        throw `Unknown value: ${value}`;
    }
  });
  return {
    setFormState,
    operator,
    orders,
    value,
    list,
    flag,
    lang
  };
}

function useTableState({ page, flag, order, operator, other, word }) {
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  useEffect(() => {
    let fresh = true;
    const current = parseInt(page) || 1;
    const pageSize = 10;
    if (current * pageSize < 1001) {
      setLoading(true);
      Fetch.history({
        page: current,
        operator,
        order,
        other,
        flag,
        word
      }).then(({ data, total }) => {
        if (fresh) {
          setPagination({
            hideOnSinglePage: true,
            pageSize,
            current,
            total
          });
          setLoading(false);
          setData(data);
        }
      });
    } else {
      setLoading(false);
    }
    return () => (fresh = false);
  }, [page, flag, order, operator, other, word]);
  const onAction = (rowid, _flag, loading) => {
    setData(data.map(e => (e.rowid === rowid ? { ...e, loading } : e)));
    if (_flag < 0) {
      Fetch.deflag(rowid).then(({ info, flag: _flag }) => {
        setData(
          data.map(e =>
            e.rowid === rowid
              ? {
                  ...e,
                  info,
                  flag: _flag,
                  tags: tagsOf(_flag & flag),
                  loading: 0
                }
              : e
          )
        );
      });
    } else {
      Fetch.reflag(rowid, _flag).then(okay => {
        if (okay) {
          setData(
            data.map(e =>
              e.rowid === rowid
                ? { ...e, flag: _flag, tags: tagsOf(_flag & flag), loading: 0 }
                : e
            )
          );
        }
      });
    }
  };
  return [loading, pagination, data, onAction];
}

function columns(onAction, list) {
  return [
    {
      title: '词条',
      dataIndex: 'word',
      render(word, { info }) {
        return (
          <WordInfo
            word={word}
            info={info}
            key={info}
            onSubmit={info => Fetch.reinfo(word, info)}
          />
        );
      }
    },
    {
      title: '标签',
      dataIndex: 'tags',
      render(tags, { rowid, flag, loading }) {
        const _loading = 1;
        const onSelectFlag = ({ key }) => {
          if (loading) return;
          const value = parseInt(key);
          onAction(rowid, flag + value, _loading);
        };
        const onDeselectFlag = ({ key }) => {
          if (loading) return;
          const value = parseInt(key);
          onAction(rowid, flag - value, -_loading);
        };
        const vals = binArrayOf((flag | 7) - 7).map(String);
        const { length } = vals;
        const menu = (
          <Menu
            multiple
            selectable
            style={{
              maxHeight: '256px',
              minWidth: '128px',
              fontSize: '12px',
              overflow: 'auto'
            }}
            selectedKeys={vals}
            onSelect={onSelectFlag}
            onDeselect={onDeselectFlag}
          >
            {list
              .map(({ short, long }, index) => ({
                short,
                long,
                index: 1 << (index + 3)
              }))
              .map(({ short, long, index }) => (
                <Menu.Item key={String(index)} title={long}>
                  {short}
                </Menu.Item>
              ))}
          </Menu>
        );
        return (
          <React.Fragment>
            {tags.map(({ long, short }) => (
              <Tag key={short} title={long} color="blue">
                {short}
              </Tag>
            ))}
            <Dropdown
              trigger={['click']}
              overlay={menu}
              getPopupContainer={() => document.querySelector('.page-content')}
            >
              <Tag color="blue" style={{ minWidth: '52px' }}>
                {Math.abs(loading) === _loading ? (
                  <Icon type="loading" />
                ) : length > 9 ? (
                  `+${length}...`
                ) : (
                  `+ ${length}...`
                )}
              </Tag>
            </Dropdown>
          </React.Fragment>
        );
      }
    },
    {
      title: '次数',
      dataIndex: 'freq'
    },
    {
      title: '最近',
      dataIndex: 'time',
      render({ short, long }) {
        return <span title={long}>{short}</span>;
      }
    },
    {
      title: '操作',
      dataIndex: 'rowid',
      key: 'action',
      align: 'center',
      render(rowid, { flag, loading }) {
        const favour = flag & 2;
        const remove = flag & 4;
        const onChange = mask => {
          if (loading) return;
          onAction(
            rowid,
            mask !== 6 ? (flag | 6) - 6 + mask - (flag & mask) : -1,
            mask
          );
        };
        return (
          <a>
            {loading === 2 ? (
              <Icon type="loading" />
            ) : (
              <Icon
                type="star"
                theme={favour ? 'filled' : 'outlined'}
                title={favour ? '已收藏' : '收藏'}
                onClick={() => onChange(2)}
              />
            )}
            <Divider type="vertical" />
            {loading === 4 ? (
              <Icon type="loading" />
            ) : (
              <Icon
                type="delete"
                theme={remove ? 'filled' : 'outlined'}
                title={remove ? '已删除' : '删除'}
                onClick={() => onChange(4)}
              />
            )}
            <Divider type="vertical" />
            {loading === 6 ? (
              <Icon type="loading" />
            ) : (
              <Icon type="undo" onClick={() => onChange(6)} />
            )}
          </a>
        );
      }
    }
  ];
}
